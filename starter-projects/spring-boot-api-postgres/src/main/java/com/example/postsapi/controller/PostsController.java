package com.example.postsapi.controller;

import com.example.postsapi.controller.response.Response;
import com.example.postsapi.controller.response.Response.ResponseType;
import com.example.postsapi.model.Post;
import com.example.postsapi.repository.PostsRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import javax.validation.Valid;

@RestController
@RequestMapping("/")
public class PostsController {

    private final PostsRepository postsRepository;

    @Autowired
    public PostsController(PostsRepository postsRepository) {
        this.postsRepository = postsRepository;
    }

    // Get all posts
    @GetMapping("/posts")
    public Response<List<Post>> getAllPosts() {
        return new Response<List<Post>>(ResponseType.SUCCESS, postsRepository.findAll());
    }

    // Create a new post
    @PostMapping("/posts")
    public Response<Post> createPost(@RequestBody @Valid Post post) {
        return new Response<Post>(ResponseType.SUCCESS, postsRepository.save(post));
    }
}