require 'active_support'
require 'active_support/core_ext/string'

def handler(event:, context:)
  # Use ActiveSupport to verify dependency was packaged
  test_string = "hello world".titleize
  { statusCode: 200, body: "rb ok - #{test_string}" }
end
