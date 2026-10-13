gem "bigdecimal", "4.1.1"
require "bigdecimal"
require "json"

def handler(event:, context:)
  spec = Gem.loaded_specs.fetch("bigdecimal")
  {
    value: JSON.parse(JSON.generate(event)),
    version: spec.version.to_s,
    decimal: (BigDecimal("0.1") + BigDecimal("0.2")).to_s("F"),
    packaged: spec.full_gem_path.start_with?("/var/task/vendor/bundle/"),
    native: $LOADED_FEATURES.any? { |path| path.start_with?("/var/task/vendor/bundle/") && path.end_with?("bigdecimal.so") },
    devAbsent: Dir.glob("/var/task/vendor/bundle/ruby/*/specifications/rake-*.gemspec").empty?,
    resource: File.read(File.join(__dir__, "message.txt")).strip
  }
end
