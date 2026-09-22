using Microsoft.AspNetCore.Authorization;
using System.Reflection;

namespace Epay3Net.Custom.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddAuthorizationHandlers(this IServiceCollection services, params Assembly[] assemblies)
    {
        if (assemblies != null && assemblies.Length != 0)
        {
            TypeInfo[] source = assemblies.Where((Assembly a) => !a.IsDynamic).Distinct().SelectMany((Assembly a) => a.DefinedTypes)
                .ToArray();
            Type authHandlerType = typeof(IAuthorizationHandler);
            {
                foreach (TypeInfo item in source.Where((TypeInfo t) => t.IsClass && !t.IsAbstract && t.AsType().ImplementsInterface(authHandlerType)))
                {
                    services.AddScoped(authHandlerType, item.AsType());
                }

                return services;
            }
        }

        return services;
    }

    private static bool ImplementsInterface(this Type type, Type interfaceType)
    {
        Type interfaceType2 = interfaceType;
        if (!(type == interfaceType2))
        {
            return type.GetTypeInfo().ImplementedInterfaces.Any((Type @interface) => @interface == interfaceType2);
        }

        return true;
    }
}
