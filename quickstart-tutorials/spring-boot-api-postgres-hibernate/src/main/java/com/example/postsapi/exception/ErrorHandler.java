package com.example.postsapi.exception;

import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.example.postsapi.controller.response.Response;
import com.example.postsapi.controller.response.Response.ResponseType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;

@RestControllerAdvice
public class ErrorHandler {

    Logger logger = LoggerFactory.getLogger(ErrorHandler.class);

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Response<String> handleAll(Exception e) {
        // If anything goes wrong, log the error.
        // You can later access the log data in the AWS console.
        logger.error(e.toString());
        return new Response<String>(ResponseType.ERROR, e.getMessage());
    }

}
