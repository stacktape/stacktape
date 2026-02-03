using Amazon.Lambda.Core;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace Function;

public class Function
{
    public string FunctionHandler(object input, ILambdaContext context)
    {
        return "dotnet ok";
    }
}
