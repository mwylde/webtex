require 'redis'
require 'json'
class LatexRenderer
	@queue = :renders
	@redis = Redis.new
	
	def self.perform(hash)
		doc = hash['doc']
		
		path = "#{File.dirname(__FILE__)}/tmp/#{doc}"
		response = `cd #{path}; pdflatex -interaction=nonstopmode -file-line-error-style #{doc}.tex`
		#hash["response"] = response
		puts "'#{JSON.dump(hash)}'"
		@redis.rpush "responses", JSON.dump(hash)
	end
end