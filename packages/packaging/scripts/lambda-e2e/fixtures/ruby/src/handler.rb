gem "json", "2.10.2"
require "json"

def handler(event:, context:)
  spec = Gem.loaded_specs.fetch("json")
  {
    value: JSON.parse(JSON.generate(event)),
    version: spec.version.to_s,
    packaged: spec.full_gem_path.start_with?("/var/task/vendor/bundle/"),
    native: $LOADED_FEATURES.any? { |path| path.start_with?("/var/task/vendor/bundle/") && path.end_with?("parser.so") },
    devAbsent: Dir.glob("/var/task/vendor/bundle/ruby/*/specifications/rake-*.gemspec").empty?,
    resource: File.read(File.join(__dir__, "message.txt")).strip
  }
end
