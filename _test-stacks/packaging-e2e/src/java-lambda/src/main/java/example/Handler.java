package example;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.google.common.base.Joiner;

import java.util.Map;

public class Handler implements RequestHandler<Map<String, Object>, String> {
  @Override
  public String handleRequest(Map<String, Object> input, Context context) {
    return Joiner.on('-').join("lambda", "ok");
  }
}
