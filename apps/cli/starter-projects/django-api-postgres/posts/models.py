from django.db import models


class Post(models.Model):
    title = models.TextField()
    content = models.TextField()
    authorEmail = models.TextField()
