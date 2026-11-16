# A PHP CMS site, as an agency's client sites are built: Apache with the MySQL driver, listening on $PORT.
FROM php:8.3-apache
RUN docker-php-ext-install pdo_mysql \
  && sed -ri 's/^Listen 80$/Listen ${PORT}/' /etc/apache2/ports.conf \
  && sed -ri 's/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/' /etc/apache2/sites-available/000-default.conf
ENV PORT=3000
COPY index.php build-mark.txt /var/www/html/
