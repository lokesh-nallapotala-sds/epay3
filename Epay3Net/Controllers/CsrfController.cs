using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Epay3Net.RateLimiting;

namespace Epay3Net.Controllers;

[Route("api/[controller]")]
[ApiController]
public class CsrfController(
    IAntiforgery antiForgery
    ) : ControllerBase
{
    [HttpGet("token")]
    [EnableRateLimiting(RateLimitPolicyNames.PublicConfig)]
    public IActionResult GetToken()
    {
        // This will create (or re-use) the anti-forgery cookies and tokens
        AntiforgeryTokenSet tokens = antiForgery.GetAndStoreTokens(this.HttpContext);

        return this.Ok(new
        {
            token = tokens.RequestToken
        });
    }
}
