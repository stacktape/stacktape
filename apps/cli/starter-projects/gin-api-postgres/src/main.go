package main

import (
	"gin-api-postgres/db"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

type JokeAPIResponseBody struct {
	CreatedAt string `json:"created_at"`
	Value     string `json:"value"`
}

func main() {
	r := gin.Default()

	postgres := db.Connect()

	r.GET("/posts", func(c *gin.Context) {
		var posts []db.Post
		err := postgres.Model(&posts).Select()
		if err != nil {
			log.Printf("Error while getting all Posts, reason: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  http.StatusInternalServerError,
				"message": "Something went wrong :(",
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status": http.StatusOK,
			"data":   posts,
		})
  })

	r.POST("/posts", func(c *gin.Context) {
			var post db.Post
			c.BindJSON(&post)
			posts := []db.Post{post}
			_, err := postgres.Model(&posts).Insert(&posts)
			if err != nil {
				log.Printf("Error while inserting a new Post to the database, reason: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  http.StatusInternalServerError,
					"message": "Something went wrong",
				})
				return
			}
			c.JSON(http.StatusOK, gin.H{
				"status":  http.StatusOK,
				"message": "Post created successfully",
		})
	})


	r.Run()
}
