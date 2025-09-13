using LeavePlanner.Api.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// EF Core + SQLite
builder.Services.AddDbContext<LeavePlannerDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default")));

// Swagger & Controllers
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddControllers();

var app = builder.Build();

// === DB: Migration beim Start (für alle Environments) ===
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<LeavePlannerDbContext>();
    await db.Database.MigrateAsync();
}

// === Dev: Swagger + Seeding ===
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<LeavePlannerDbContext>();
    DbSeeder.Seed(db); // idempotent (füllt nur, wenn leer)
}
else
{
    // Prod: HTTPS Redirect & HSTS
    app.UseHttpsRedirection();
    app.UseHsts();
}

// --- Debug/Health Endpoints ---
app.MapGet("/debug/env", (IHostEnvironment env) =>
    Results.Ok(new { environment = env.EnvironmentName })
).WithOpenApi();

app.MapGet("/health/db", async (LeavePlannerDbContext db) =>
{
    var canConnect = await db.Database.CanConnectAsync();
    var hasPending = (await db.Database.GetPendingMigrationsAsync()).Any();
    return Results.Ok(new { connected = canConnect, pendingMigrations = hasPending });
})
.WithName("HealthDb")
.WithOpenApi();

app.MapGet("/debug/employees", async (LeavePlannerDbContext db) =>
    await db.Employees.Select(e => new { e.Id, e.Name, e.JobTitle }).ToListAsync()
).WithOpenApi();

app.MapGet("/debug/migrations", async (LeavePlannerDbContext db) =>
    Results.Ok(await db.Database.GetAppliedMigrationsAsync())
).WithOpenApi();

// Beispiel-Endpoint aus Template
var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast = Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast(
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        )).ToArray();
    return forecast;
})
.WithName("GetWeatherForecast")
.WithOpenApi();

app.MapControllers();

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
