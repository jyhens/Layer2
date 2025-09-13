using System;

namespace LeavePlanner.Api.Models;

public class Customer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = null!;
}
