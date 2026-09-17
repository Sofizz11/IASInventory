using Microsoft.EntityFrameworkCore;

public class OrderService
{
    private readonly AppDbContext _context;

    private static readonly string[] ValidStatuses =
    {
        "Pending",
        "Processing",
        "Completed",
        "Cancelled"
    };

    public OrderService(AppDbContext context)
    {
        _context = context;
    }

    public List<Order> GetOrders()
    {
        return _context.Orders
            .Include(o => o.Product)
            .AsNoTracking()
            .ToList();
    }

    public Order? GetOrder(int id)
    {
        return _context.Orders
            .Include(o => o.Product)
            .AsNoTracking()
            .FirstOrDefault(o => o.Id == id);
    }

    public Order CreateOrder(CreateOrderRequest request)
    {
        var product = _context.Products
            .FirstOrDefault(p => p.Id == request.ProductId);

        if (product == null)
        {
            throw new KeyNotFoundException(
                $"No existe un producto con id {request.ProductId}.");
        }

        if (request.Quantity <= 0)
        {
            throw new ArgumentException(
                "La cantidad debe ser mayor que 0.");
        }

        if (product.Stock < request.Quantity)
        {
            throw new InvalidOperationException(
                $"Stock insuficiente. Stock disponible: {product.Stock}.");
        }

        using var transaction = _context.Database.BeginTransaction();

        try
        {
            product.Stock -= request.Quantity;

            var order = new Order
            {
                ProductId = product.Id,
                Quantity = request.Quantity,
                Status = "Pending"
            };

            _context.Orders.Add(order);

            _context.SaveChanges();

            transaction.Commit();

            return _context.Orders
                .Include(o => o.Product)
                .AsNoTracking()
                .First(o => o.Id == order.Id);
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    public Order? UpdateStatus(int id, string status)
    {
        var normalizedStatus = status.Trim();

        var validStatus = ValidStatuses.FirstOrDefault(
            s => s.Equals(
                normalizedStatus,
                StringComparison.OrdinalIgnoreCase));

        if (validStatus == null)
        {
            throw new ArgumentException(
                "Status debe ser Pending, Processing, Completed o Cancelled.");
        }

        var order = _context.Orders
            .FirstOrDefault(o => o.Id == id);

        if (order == null)
        {
            return null;
        }

        order.Status = validStatus;

        _context.SaveChanges();

        return _context.Orders
            .Include(o => o.Product)
            .AsNoTracking()
            .First(o => o.Id == id);
    }
}