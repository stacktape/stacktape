package example;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;

import java.util.Map;

public class Handler implements RequestHandler<Map<String, Object>, String> {
    @Override
    public String handleRequest(Map<String, Object> input, Context context) {
        throw new RuntimeException("Java RuntimeException from Lambda");
    }
}
