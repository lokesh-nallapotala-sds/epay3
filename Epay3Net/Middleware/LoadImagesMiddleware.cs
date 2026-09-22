using Epay3Net.Controllers;

namespace Epay3Net.Middleware;

public class LoadImagesMiddleware(RequestDelegate next, IServiceProvider serviceProvider) {
    private readonly RequestDelegate next = next;
    private readonly IServiceProvider serviceProvider = serviceProvider;
    private static bool imagesLoaded = false;

    public async Task InvokeAsync(HttpContext context) {
        if (!imagesLoaded) {
            using (IServiceScope scope = this.serviceProvider.CreateScope()) {
                ConfigController controller = scope.ServiceProvider.GetRequiredService<ConfigController>();
                await controller.LoadImagesForApp();
                imagesLoaded = true; // Mark as loaded
            }
        }

        // Proceed to the next middleware
        await this.next(context);
    }
}
