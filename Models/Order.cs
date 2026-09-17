using System.ComponentModel.DataAnnotations;

public class Order
{
    public int Id { get; set; }

    [Range(1, int.MaxValue)]
    public int ProductId { get; set; }

    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    [Required]
    public string Status { get; set; } = "Pending";

    public Product? Product { get; set; }
}