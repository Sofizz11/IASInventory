using Microsoft.EntityFrameworkCore;

public class ProductService
{
    private readonly AppDbContext _context;

    public ProductService(AppDbContext context)
    {
        _context = context;
    }

    public List<Product> GetProducts()
    {
        return _context.Products.ToList();
    }

    public Product? GetProduct(int id)
    {
        return _context.Products.FirstOrDefault(p => p.Id == id);
    }

    public Product CreateProduct(Product product)
    {
        _context.Products.Add(product);
        _context.SaveChanges();

        return product;
    }

    public Product? UpdateProduct(int id, Product product)
    {
        var existingProduct = _context.Products.FirstOrDefault(p => p.Id == id);

        if (existingProduct == null)
        {
            return null;
        }

        existingProduct.Name = product.Name;
        existingProduct.Description = product.Description;
        existingProduct.Price = product.Price;
        existingProduct.Stock = product.Stock;

        _context.SaveChanges();

        return existingProduct;
    }

    public Product? DeleteProduct(int id)
    {
        var product = _context.Products.FirstOrDefault(p => p.Id == id);

        if (product == null)
        {
            return null;
        }

        _context.Products.Remove(product);
        _context.SaveChanges();

        return product;
    }
}