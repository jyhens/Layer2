using LeavePlanner.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LeavePlanner.Api.Data;

public class LeavePlannerDbContext : DbContext
{
    public LeavePlannerDbContext(DbContextOptions<LeavePlannerDbContext> options) : base(options) { }

    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectAssignment> ProjectAssignments => Set<ProjectAssignment>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);

    // Employee -> Assignments (1:n)
    modelBuilder.Entity<Employee>()
        .HasMany(e => e.ProjectAssignments)
        .WithOne(pa => pa.Employee!)
        .HasForeignKey(pa => pa.EmployeeId);

    // Project -> Assignments (1:n)
    modelBuilder.Entity<Project>()
        .HasMany(p => p.ProjectAssignments)
        .WithOne(pa => pa.Project!)
        .HasForeignKey(pa => pa.ProjectId);

    // Project -> Customer (n:1)
    modelBuilder.Entity<Project>()
        .HasOne(p => p.Customer)
        .WithMany()
        .HasForeignKey(p => p.CustomerId)
        .OnDelete(DeleteBehavior.Restrict);

    // Enddatum soll nicht vor Startdatum liegen
    modelBuilder.Entity<Project>()
        .ToTable(t => t.HasCheckConstraint(
            "CK_Project_Period",
            "EndDate IS NULL OR EndDate >= StartDate"
        ));

    // Employee -> LeaveRequests (1:n)
    modelBuilder.Entity<Employee>()
        .HasMany(e => e.LeaveRequests)
        .WithOne(lr => lr.Employee!)
        .HasForeignKey(lr => lr.EmployeeId);

    // Ein Urlaubsantrag pro Mitarbeiter & Datum
    modelBuilder.Entity<LeaveRequest>()
        .HasIndex(lr => new { lr.EmployeeId, lr.Date })
        .IsUnique();

    // gleiche Employee <-> Project-Zuordnung nur einmal
    modelBuilder.Entity<ProjectAssignment>()
        .HasIndex(pa => new { pa.EmployeeId, pa.ProjectId })
        .IsUnique();

    // Validierungs-Constraints
    modelBuilder.Entity<Employee>()
        .Property(e => e.Name)
        .IsRequired()
        .HasMaxLength(200);

    modelBuilder.Entity<Customer>()
        .Property(c => c.Name)
        .IsRequired()
        .HasMaxLength(200);

    modelBuilder.Entity<Project>()
        .Property(p => p.Name)
        .IsRequired()
        .HasMaxLength(200);
}

}
