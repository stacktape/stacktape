package db

import (
	"log"
	"os"

	"github.com/go-pg/pg/v10"
	"github.com/go-pg/pg/v10/orm"
)

func Connect() *pg.DB {
	opt, err := pg.ParseURL(getEnv("STP_MAIN_DATABASE_CONNECTION_STRING", "postgres"))
	if err != nil {
		panic(err)
	}

	db := pg.Connect(opt)

	if db == nil {
		log.Printf("Failed to connect to PostgreSQL")
		os.Exit(100)
	}

	log.Printf("Connected to PostgreSQL")

	createError := db.Model(&Post{}).CreateTable(&orm.CreateTableOptions{IfNotExists: true})
	if createError != nil {
		log.Printf("Error while creating Posts table, reason: %v\n", createError)
	} else {
		log.Printf("Posts table created")
	}

	return db
}

type Post struct {
	Title       string `json:"title"`
	AuthorEmail string `json:"authorEmail"`
	Content     string `json:"content"`
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
