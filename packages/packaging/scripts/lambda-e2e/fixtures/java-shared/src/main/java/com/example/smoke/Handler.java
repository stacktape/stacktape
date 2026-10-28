package com.example.smoke;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

public final class Handler {
    public String handleRequest(Map<String, String> event) throws IOException {
        try (var resource = Handler.class.getResourceAsStream("/message.txt")) {
            if (resource == null) throw new IOException("message.txt missing from classpath");
            return Shared.message() + ":" + new String(resource.readAllBytes(), StandardCharsets.UTF_8).trim() + ":" + event.get("name");
        }
    }
}
