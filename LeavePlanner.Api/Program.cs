using LeavePlanner.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

const string DevCors = "DevCors";
builder.Services.AddCors(options =>
{
    options.AddPolicy(DevCors, policy =>
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// EF Core + SQLite
builder.Services.AddDbContext<LeavePlannerDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default")));

// Swagger & Controllers
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "LeavePlanner API", Version = "v1" });
    c.AddSecurityDefinition("EmployeeId", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.ApiKey,
        In = ParameterLocation.Header,
        Name = "X-Employee-Id",
        Description = "Paste an existing Employee GUID to act as this user (role-based checks)"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "EmployeeId" }
            },
            Array.Empty<string>()
        }
    });
});
builder.Services.AddControllers();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseCors(DevCors);
}

// DB: Migration beim Start
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<LeavePlannerDbContext>();
    await db.Database.MigrateAsync();
}

// Dev: Swagger + Seeding
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    using var scopeDev = app.Services.CreateScope();
    var devDb = scopeDev.ServiceProvider.GetRequiredService<LeavePlannerDbContext>();
    DbSeeder.Seed(devDb); // idempotent
}
else
{
    app.UseHttpsRedirection();
    app.UseHsts();
}

// Debug/Health
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

app.MapControllers();

app.Run();
