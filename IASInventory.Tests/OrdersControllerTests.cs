using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

public class OrdersControllerTests
{
    private static (AppDbContext Context, SqliteConnection Connection)
        CreateContext()
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
            Name = "Mouse Gamer",
            Description = "Mouse inalambrico RGB",
            Price = 59.90m,
            Stock = stock
        };

        context.Products.Add(product);
        context.SaveChanges();

        return product;
    }

    [Fact]
    public void GetOrders_ReturnsOk()
    {
        var (context, connection) = CreateContext();

        try
        {
            var service = new OrderService(context);
            var controller = new OrdersController(service);

            var result = controller.GetOrders();

            Assert.IsType<OkObjectResult>(result);
        }
        finally
        {
            context.Dispose();
            connection.Dispose();
        }
    }

    [Fact]
    public void GetOrder_WithExistingOrder_ReturnsOk()
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
            var controller = new OrdersController(service);

            var result = controller.GetOrder(order.Id);

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }
        finally
        {
            context.Dispose();
            connection.Dispose();
        }
    }

    [Fact]
    public void GetOrder_WithNonExistingOrder_ReturnsNotFound()
    {
        var (context, connection) = CreateContext();

        try
        {
            var service = new OrderService(context);
            var controller = new OrdersController(service);

            var result = controller.GetOrder(999);

            Assert.IsType<NotFoundObjectResult>(result);
        }
        finally
        {
            context.Dispose();
            connection.Dispose();
        }
    }

    [Fact]
    public void GetOrder_WithInvalidId_ReturnsBadRequest()
    {
        var (context, connection) = CreateContext();

        try
        {
            var service = new OrderService(context);
            var controller = new OrdersController(service);

            var result = controller.GetOrder(0);

            Assert.IsType<BadRequestObjectResult>(result);
        }
        finally
        {
            context.Dispose();
            connection.Dispose();
        }
    }

    [Fact]
    public void CreateOrder_WithValidRequest_ReturnsCreated()
    {
        var (context, connection) = CreateContext();

        try
        {
            var product = CreateProduct(context);

            var service = new OrderService(context);
            var controller = new OrdersController(service);

            var request = new CreateOrderRequest
            {
                ProductId = product.Id,
                Quantity = 2
            };

            var result = controller.CreateOrder(request);

            var createdResult =
                Assert.IsType<CreatedAtActionResult>(result);

            Assert.NotNull(createdResult.Value);
            Assert.Equal(2, product.Stock);
        }
        finally
        {
            context.Dispose();
            connection.Dispose();
        }
    }

    [Fact]
    public void CreateOrder_WithNonExistingProduct_ReturnsNotFound()
    {
        var (context, connection) = CreateContext();

        try
        {
            var service = new OrderService(context);
            var controller = new OrdersController(service);

            var request = new CreateOrderRequest
            {
                ProductId = 999,
                Quantity = 1
            };

            var result = controller.CreateOrder(request);

            Assert.IsType<NotFoundObjectResult>(result);
        }
        finally
        {
            context.Dispose();
            connection.Dispose();
        }
    }

    [Fact]
    public void CreateOrder_WithInsufficientStock_ReturnsConflict()
    {
        var (context, connection) = CreateContext();

        try
        {
            var product = CreateProduct(context, 2);

            var service = new OrderService(context);
            var controller = new OrdersController(service);

            var request = new CreateOrderRequest
            {
                ProductId = product.Id,
                Quantity = 3
            };

            var result = controller.CreateOrder(request);

            Assert.IsType<ConflictObjectResult>(result);

            var currentProduct = context.Products
                .First(p => p.Id == product.Id);

            Assert.Equal(2, currentProduct.Stock);
            Assert.Empty(context.Orders);
        }
        finally
        {
            context.Dispose();
            connection.Dispose();
        }
    }

    [Fact]
    public void UpdateStatus_WithValidStatus_ReturnsOk()
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
            var controller = new OrdersController(service);

            var request = new UpdateOrderStatusRequest
            {
                Status = "Processing"
            };

            var result = controller.UpdateStatus(
                order.Id,
                request);

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }
        finally
        {
            context.Dispose();
            connection.Dispose();
        }
    }

    [Fact]
    public void UpdateStatus_WithInvalidStatus_ReturnsBadRequest()
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
            var controller = new OrdersController(service);

            var request = new UpdateOrderStatusRequest
            {
                Status = "InvalidStatus"
            };

            var result = controller.UpdateStatus(
                order.Id,
                request);

            Assert.IsType<BadRequestObjectResult>(result);
        }
        finally
        {
            context.Dispose();
            connection.Dispose();
        }
    }

    [Fact]
    public void UpdateStatus_WithNonExistingOrder_ReturnsNotFound()
    {
        var (context, connection) = CreateContext();

        try
        {
            var service = new OrderService(context);
            var controller = new OrdersController(service);

            var request = new UpdateOrderStatusRequest
            {
                Status = "Processing"
            };

            var result = controller.UpdateStatus(
                999,
                request);

            Assert.IsType<NotFoundObjectResult>(result);
        }
        finally
        {
            context.Dispose();
            connection.Dispose();
        }
    }
}