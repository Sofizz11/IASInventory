using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("iasinventory/orders")]
public class OrdersController : ControllerBase
{
    private readonly OrderService _orderService;

    public OrdersController(OrderService orderService)
    {
        _orderService = orderService;
    }

    [HttpGet]
    public IActionResult GetOrders()
    {
        return Ok(_orderService.GetOrders());
    }

    [HttpGet("{id}")]
    public IActionResult GetOrder(int id)
    {
        if (id <= 0)
        {
            return BadRequest(new
            {
                message = "El id debe ser mayor que 0."
            });
        }

        var order = _orderService.GetOrder(id);

        if (order == null)
        {
            return NotFound(new
            {
                message = $"No existe una orden con id {id}."
            });
        }

        return Ok(order);
    }

    [HttpPost]
    public IActionResult CreateOrder(
        [FromBody] CreateOrderRequest request)
    {
        try
        {
            var order = _orderService.CreateOrder(request);

            return CreatedAtAction(
                nameof(GetOrder),
                new { id = order.Id },
                order);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new
            {
                message = ex.Message
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new
            {
                message = ex.Message
            });
        }
    }

    [HttpPut("{id}/status")]
    public IActionResult UpdateStatus(
        int id,
        [FromBody] UpdateOrderStatusRequest request)
    {
        if (id <= 0)
        {
            return BadRequest(new
            {
                message = "El id debe ser mayor que 0."
            });
        }

        try
        {
            var order = _orderService.UpdateStatus(
                id,
                request.Status);

            if (order == null)
            {
                return NotFound(new
                {
                    message = $"No existe una orden con id {id}."
                });
            }

            return Ok(order);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }
}