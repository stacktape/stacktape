require 'webrick'

port = ENV.fetch('PORT', '3000').to_i
server = WEBrick::HTTPServer.new(Port: port)

server.mount_proc '/' do |req, res|
  if req.path == '/error'
    raise StandardError, "Ruby container StandardError with stack trace"
  end
  res.body = 'OK'
end

puts "Ruby container started on port #{port}"
server.start
