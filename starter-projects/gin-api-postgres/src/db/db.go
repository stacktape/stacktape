package db

import (
	"log"
	"os"

	"github.com/go-pg/pg/v9"
	"github.com/go-pg/pg/v9/orm"
)

func Connect() *pg.DB {
	opt, err := pg.ParseURL(getEnv("STP_MAIN_DATABASE_CONNECTION_STRING", "postgres"))
	if err != nil {
		panic(err)
	}

	opt.onConnect = func(conn *pg.Conn) error {
		return CreatePostTable(conn)
	}

	db := pg.Connect(opt)

	if db == nil {
		log.Printf("Failed to connect to PotsgreSQL")
		os.Exit(100)
	}

	log.Printf("Connected to PostgreSQL")

	return db
}

func CreatePostTable(conn *pg.Conn) error {
	opts := orm.CreateTableOptions{
		IfNotExists: true,
	}

	createError := conn.CreateTable(&Post{}, &opts)

	if createError != nil {
		log.Printf("Error while creating Posts table, reason: %v\n", createError)
		return createError
	}

	log.Printf("Posts table created")
	return nil
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
