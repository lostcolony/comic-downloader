defmodule ComicDownloader.Default do
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

  @spec _save_page(map()) :: {list(binary()), integer()}
  def _save_page(%{"url" => url, "img_css" => img_css, "next_css" => next_css, "comic_name" => comic_name, "count" => count} = data) do
    body = ComicDownloader.get_url(url)
    |> Floki.parse_document!()

    img_data = body
    |> Floki.find(img_css)

    img_url = case Map.get(data, "img_attr", "src") do
      a when is_binary(a) -> to_string(Floki.attribute(img_data, a))
      b -> b
    end

    image_name = get_image_name(data)

    new_count = case {img_url, Map.get(data, "fail_on_no_img", true)} do
      {[], false} -> count #Depending on the site they may have a post w/o a comic. Not erroring here -does- imply that we need to make sure any usage of this downloader works before walking away.
      _ ->
        img_url = construct_url(to_string(img_url), to_string(url))
        ComicDownloader.get_url(img_url, Map.get(data, "headers", []))
        |> ComicDownloader.write_image(comic_name, image_name, Map.get(data, "extension", ".jpg"))

        count + 1
    end



    next = body
    |> Floki.find(next_css)
    |> Floki.attribute("href")

    {construct_url(to_string(next), url), new_count}
  end


  def construct_url("", _) do
    []
  end
  def construct_url(_, []) do
    []
  end
  @spec construct_url(binary() | URI.t(), binary() | URI.t()) :: binary()
  def construct_url(path_part, url) do
    first = URI.parse(url)
    second = URI.parse(path_part)

    case Map.get(second, :host) do
      nil -> Map.get(first, :scheme) <> "://" <> Map.get(first, :host) <> Map.get(second, :path)
      _ -> path_part
    end

  end


  def get_image_name(%{"name_func" => name_func, "url" => url}) do
    name_func.(url)
  end
  def get_image_name(%{"count" => count}) do
    count
  end

  def url_to_name(url) do
      Regex.run(~r/.*\/(\d+\/\d+\/\d+)/i, url)
      |> Enum.at(1)
      |> String.replace("/", "-")
  end
end
