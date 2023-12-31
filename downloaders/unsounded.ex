defmodule ComicDownloader.Unsounded do
@spec save_page(map()) :: map()
  def save_page(data) do
    {next, count} = _save_page(data)
    :timer.sleep(Map.get(data, "delay", 500))
    case next do
      [] -> data
      _ ->
        data
        |> Map.put("url", to_string(next))
        |> Map.put("count", count)
    end
  end

  def _save_page(%{"url" => url, "last_url" => url, "count" => count}) do
    {[], count}
  end

  @spec _save_page(map()) :: {list() | binary(), integer()}
  def _save_page(%{"url" => url, "img_css" => img_css, "next_css" => next_css, "comic_name" => comic_name, "count" => count} = data) do
    body = ComicDownloader.get_url(url)
    |> Floki.parse_document!()

    img_data = case Floki.find(body, img_css) do
      [_ | _] = a -> a
      [] -> Floki.find(body, "div#double img[src*=\".jpg\"]")
    end

    img_urls = case Map.get(data, "img_attr", "src") do
      a when is_binary(a) -> Floki.attribute(img_data, a)
      b -> b
    end

    img_urls = case img_urls do
      a when is_binary(a) -> [a]
      [_ | _] = b -> b
    end

    new_counts = 0..(length(img_urls) -1)

    Enum.zip(img_urls, new_counts)
    |> Enum.map(fn {img_url, new_count} ->
      {image_name, extension} = case img_urls do
        [_] -> {count, ".jpg"}
        [_ | _] -> {count, "_" <> to_string(new_count) <> ".jpg"}
      end
      img_url = ComicDownloader.Default.construct_url(to_string(img_url), to_string(url), data)

      ComicDownloader.get_url(img_url, Map.get(data, "headers", []))
      |> ComicDownloader.write_image(comic_name, image_name, extension)
    end)

    next = body
    |> Floki.find(next_css)
    |> Floki.attribute("href")

    {ComicDownloader.Default.construct_url(to_string(next), url, data), count + 1}
  end
end
