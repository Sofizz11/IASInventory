using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

public class OrderServiceTests
{
    private static (AppDbContext Context, SqliteConnection Connection) CreateContext()
    {
        var connection = new SqliteConnection("Data Source=:memory:");
        connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;

        var context = new AppDbContext(options);
        context.Database.EnsureCreated();

        return (context, connection);
    }

    private static Product CreateProduct(
        AppDbContext context,
        int stock = 10)
    {
        var product = new Product
        {
            Name = "Teclado",
            Description = "Teclado mecanico",
            Price = 120.50m,
            Stock = stock
        };

        context.Products.Add(product);
        context.SaveChanges();

        return product;
    }

    [Fact]
    public void GetOrders_ReturnsOrdersWithProduct()
    {
        var (context, connection) = CreateContext();

        try
        {
            var product = CreateProduct(context);

            context.Orders.Add(new Order
            {
                ProductId = product.Id,
                Quantity = 2,
                Status = "Pending"
            });

            context.SaveChanges();

            var service = new OrderService(context);

            var orders = service.GetOrders();

            Assert.Single(orders);
            Assert.Equal(2, orders[0].Quantity);
            Assert.Equal("Pending", orders[0].Status);
            Assert.NotNull(orders[0].Product);
            Assert.Equal(product.Id, orders[0].Product!.Id);
        }
        finally
        {
            context.Dispose();
            connection.Dispose();
        }
    }

    [Fact]
    public void GetOrder_WithExistingId_ReturnsOrder()
    {
        var (context, connection) = CreateContext();

        try
        {
            var product = CreateProduct(context);

            var order = new Order
            {
                ProductId = product.Id,
                Quantity = 2,
                Status = "Pending"
            };

            context.Orders.Add(order);
            context.SaveChanges();

            var service = new OrderService(context);

            var result = service.GetOrder(order.Id);

            Assert.NotNull(result);
            Assert.Equal(order.Id, result!.Id);
            Assert.Equal(product.Id, result.ProductId);
            Assert.NotNull(result.Product);
        }
        finally
        {
            context.Dispose();
            connection.Dispose();
        }
    }

    [Fact]
    public void GetOrder_WithNonExistingId_ReturnsNull()
    {
        var (context, connection) = CreateContext();

        try
        {
            var service = new OrderService(context);

            var result = service.GetOrder(999);

            Assert.Null(result);
        }
        finally
        {
            context.Dispose();
            connection.Dispose();
        }
    }

    [Fact]
    public void CreateOrder_CreatesOrderAndDecreasesStock()
    {
        var (context, connection) = CreateContext();

        try
        {
            var product = CreateProduct(context, 10);

            var service = new OrderService(context);

            var request = new CreateOrderRequest
            {
                ProductId = product.Id,
                Quantity = 3
            };

            var order = service.CreateOrder(request);

            Assert.NotNull(order);
            Assert.Equal(product.Id, order.ProductId);
            Assert.Equal(3, order.Quantity);
            Assert.Equal("Pending", order.Status);

            var updatedProduct = context.Products
                .First(p => p.Id == product.Id);

            Assert.Equal(7, updatedProduct.Stock);
        }
        finally
        {
            context.Dispose();
            connection.Dispose();
        }
    }

    [Fact]
    public void CreateOrder_WithNonExistingProduct_ThrowsKeyNotFoundException()
    {
        var (context, connection) = CreateContext();

        try
        {
            var service = new OrderService(context);

            var request = new CreateOrderRequest
            {
                ProductId = 999,
                Quantity = 1
            };

            Assert.Throws<KeyNotFoundException>(
                () => service.CreateOrder(request));
        }
        finally
        {
            context.Dispose();
            connection.Dispose();
        }
    }

    [Fact]
    public void CreateOrder_WithInvalidQuantity_ThrowsArgumentException()
    {
        var (context, connection) = CreateContext();

        try
        {
            var product = CreateProduct(context);

            var service = new OrderService(context);

            var request = new CreateOrderRequest
            {
                ProductId = product.Id,
                Quantity = 0
            };

            Assert.Throws<ArgumentException>(
                () => service.CreateOrder(request));
        }
        finally
        {
            context.Dispose();
            connection.Dispose();
        }
    }

    [Fact]
    public void CreateOrder_WithInsufficientStock_DoesNotCreateOrderOrChangeStock()
    {
        var (context, connection) = CreateContext();

        try
        {
            var product = CreateProduct(context, 4);

            var service = new OrderService(context);

            var request = new CreateOrderRequest
            {
                ProductId = product.Id,
                Quantity = 5
            };

            Assert.Throws<InvalidOperationException>(
                () => service.CreateOrder(request));

            var updatedProduct = context.Products
                .First(p => p.Id == product.Id);

            Assert.Equal(4, updatedProduct.Stock);
            Assert.Empty(context.Orders);
        }
        finally
        {
            context.Dispose();
            connection.Dispose();
        }
    }

    [Fact]
    public void UpdateStatus_WithValidStatus_UpdatesOrder()
    {
        var (context, connection) = CreateContext();

        try
        {
            var product = CreateProduct(context);

            var order = new Order
            {
                ProductId = product.Id,
                Quantity = 1,
                Status = "Pending"
            };

            context.Orders.Add(order);
            context.SaveChanges();

            var service = new OrderService(context);

            var result = service.UpdateStatus(
                order.Id,
                "Processing");

            Assert.NotNull(result);
            Assert.Equal("Processing", result!.Status);
        }
        finally
        {
            context.Dispose();
            connection.Dispose();
        }
    }

    [Fact]
    public void UpdateStatus_IsCaseInsensitive()
    {
        var (context, connection) = CreateContext();

        try
        {
            var product = CreateProduct(context);

            var order = new Order
            {
                ProductId = product.Id,
                Quantity = 1,
                Status = "Pending"
            };

            context.Orders.Add(order);
            context.SaveChanges();

            var service = new OrderService(context);

            var result = service.UpdateStatus(
                order.Id,
                "completed");

            Assert.NotNull(result);
            Assert.Equal("Completed", result!.Status);
        }
        finally
        {
            context.Dispose();
            connection.Dispose();
        }
    }

    [Fact]
    public void UpdateStatus_WithInvalidStatus_ThrowsArgumentException()
    {
        var (context, connection) = CreateContext();

        try
        {
            var product = CreateProduct(context);

            var order = new Order
            {
                ProductId = product.Id,
                Quantity = 1,
                Status = "Pending"
            };

            context.Orders.Add(order);
            context.SaveChanges();

            var service = new OrderService(context);

            Assert.Throws<ArgumentException>(
                () => service.UpdateStatus(order.Id, "InvalidStatus"));
        }
        finally
        {
            context.Dispose();
            connection.Dispose();
        }
    }

    [Fact]
    public void UpdateStatus_WithNonExistingOrder_ReturnsNull()
    {
        var (context, connection) = CreateContext();

        try
        {
            var service = new OrderService(context);

            var result = service.UpdateStatus(
                999,
                "Processing");

            Assert.Null(result);
        }
        finally
        {
            context.Dispose();
            connection.Dispose();
        }
    }
}