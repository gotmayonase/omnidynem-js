#!/Users/mmayo/.rbenv/shims/ruby
def process_url(url, download_directory)
  required_levels = [1,1,nil,1,10,20,30,40]
  costs = [1,1,nil,1,1,2,5,8]
  types = %w{basic basic basic basic basic intermediate advanced master}
  frame = nil
  required_frame = nil
  json = []
  frame_json = []
  doc = Nokogiri::HTML(open(url))
  id = 1
  frame_id = 1
  doc.css('#mw-content-text table tr')[2..-1].each do |row|
    row.css('td').each_with_index do |td, i|
      next if td.content.nil? || td.content.strip.empty?
      # basic perk
      if i == 0 || i == 1
        frame = nil
        required_frame = nil
      # frame name
      elsif i == 2
        frame = td.css('a').last.content
        frame_json << {
          id: frame_id,
          name: frame
        }
        frame_id = frame_id + 1
        next
      # frame specific
      elsif i == 3
        required_frame = frame
      # anything else
      else
        required_frame = nil
      end

      span = td.css('span')[0]
      desc = span['title']
      img = span.css('a.image img')[0]
      if img
        img_path = img['src']
        href = "http://firefall-wiki.com#{img_path}"
        image_name = File.basename(img_path)

        filename = File.join(download_directory,image_name)
        unless File.exists? filename
          puts "Downloading #{href} to #{filename}"
          image = open(href).read rescue nil
          if image
            File.open(filename, 'wb') { |f| f.write(image) }
          else
            `touch #{filename}`
          end
        end
      else
        image_name = nil
      end
      name = span.css('a')[1].content

      json << {
        id: id,
        type: types[i],
        name: name,
        desc: desc,
        cost: costs[i],
        level: required_levels[i],
        frame: frame,
        restrictions: required_frame ? [ required_frame ] : [],
        image: image_name
      }

      id = id + 1
    end
  end
  File.open('/Users/mmayo/projects/firefall-perks/perks.json', 'wb') { |f| f.write(json.to_json) }
  File.open('/Users/mmayo/projects/firefall-perks/frames.json', 'wb') { |f| f.write(frame_json.to_json) }
end


require 'nokogiri'
require 'open-uri'
require 'json'
puts "Starting import @ #{Time.now}"
url = "http://firefall-wiki.com/w/Perk"

process_url(url, "/Users/mmayo/projects/firefall-perks/images/perks/")
