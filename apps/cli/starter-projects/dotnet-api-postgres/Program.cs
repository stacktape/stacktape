using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var rawConnString = Environment.GetEnvironmentVariable("STP_MAIN_DATABASE_CONNECTION_STRING");
string connectionString;
if (rawConnString != null && rawConnString.StartsWith("postgres"))
{
    var uri = new Uri(rawConnString);
    var userInfo = uri.UserInfo.Split(':');
    connectionString = $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={Uri.UnescapeDataString(userInfo[0])};Password={Uri.UnescapeDataString(userInfo[1])};SSL Mode=Require;Trust Server Certificate=true";
}
else
{
    connectionString = rawConnString ?? "Host=localhost;Database=dev;Username=postgres;Password=postgres";
}

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

app.MapGet("/", () => new { message = "ASP.NET Core API running on AWS" });

app.MapGet("/posts", async (AppDbContext db) =>
    new { data = await db.Posts.ToListAsync() });

app.MapPost("/posts", async (AppDbContext db, Post post) =>
{
    post.Id = Guid.NewGuid().ToString();
    db.Posts.Add(post);
    await db.SaveChangesAsync();
    return Results.Created($"/posts/{post.Id}", new { message = "Post created", data = post });
});

app.Run();

public class Post
{
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string? Content { get; set; }
    public string? AuthorEmail { get; set; }
}

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<Post> Posts => Set<Post>();
}
