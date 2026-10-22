require "json"

def handler(event:, context:)
  { file: __FILE__, value: JSON.parse(JSON.generate(event)) }
end
