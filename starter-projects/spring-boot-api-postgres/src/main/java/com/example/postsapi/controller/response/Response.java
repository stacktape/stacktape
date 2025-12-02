package com.example.postsapi.controller.response;

public class Response<Data> {
    private Data data;
    private ResponseType message;

    public enum ResponseType {
        SUCCESS, ERROR
    }

    public Response(ResponseType responseType, Data data) {
        this.data = data;
        this.message = responseType;
    }

    public Data getData() {
        return this.data;
    }

    public ResponseType getMessage() {
        return this.message;
    }
}
