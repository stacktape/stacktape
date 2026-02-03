package com.example;

import com.google.common.base.Joiner;

public class App {
  public static void main(String[] args) {
    System.out.println(Joiner.on('-').join("batch", "ok"));
  }
}
