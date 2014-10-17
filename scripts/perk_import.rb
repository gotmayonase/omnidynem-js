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

  perk_file = "/Users/mmayo/projects/firefall-perks/data/perks.json"
  frame_file = "/Users/mmayo/projects/firefall-perks/data/frames.json"
  perks = JSON.parse(File.read(perk_file))
  max_perk_id = perks.map { |perk| perk['id'].to_i }.max
  frames = JSON.parse(File.read(frame_file))
  max_frame_id = frames.map { |frame| frame['id'].to_i }.max
  frame_id = max_frame_id + 1
  id = max_perk_id + 1
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
        img = td.css('img')[0]

        thumb_path = img['src']
        full_size_path = img['srcset'].split(',').last.split(' ').first
        [thumb_path, full_size_path].each do |img_path|
          href = "http://firefall-wiki.com#{img_path}"
          image_name = File.basename(img_path)

          filename = File.join(download_directory,'frames',image_name)
          unless File.exists? filename
            puts "Downloading #{href} to #{filename}"
            image = open(href).read rescue nil
            if image
              File.open(filename, 'wb') { |f| f.write(image) }
            else
              `touch #{filename}`
            end
          end
        end
        new_json = {
          'name' => frame,
          'thumb' => File.basename(thumb_path),
          'image' => File.basename(full_size_path),
          'text' => frame,
          'click' => "setFrame(item)"
        }
        if existing_frame = frames.detect { |f| f["name"] == frame }
          new_json = existing_frame.merge(new_json)
          frame_json << new_json
        else
          new_json = new_json.merge({ "id" => frame_id })
          frame_json << new_json
          frame_id = frame_id + 1
        end

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

        filename = File.join(download_directory,'perks',image_name)
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
      perk_json = {
        'type' => types[i].capitalize,
        'name' => name,
        'desc' => desc,
        'cost' => costs[i],
        'level' => required_levels[i],
        'frame' => frame,
        'restrictions' => required_frame ? [ required_frame ] : [],
        'image' => image_name
      }
      if perk = perks.detect { |perk| perk['name'] == name }
        new_json = perk.merge(perk_json)
        json << new_json
      else
        new_json = perk_json.merge( { "id" => id} )
        json << new_json
        id = id + 1
      end


    end
  end
  File.open(perk_file, 'wb') { |f| f.write(json.to_json) }
  File.open(frame_file, 'wb') { |f| f.write(frame_json.to_json) }
end


require 'nokogiri'
require 'open-uri'
require 'json'
puts "Starting import @ #{Time.now}"
url = "http://firefall-wiki.com/w/Perk"

process_url(url, "/Users/mmayo/projects/firefall-perks/images/")
