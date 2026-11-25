IO.inspect(
  Enum.take(
    Enum.sort_by(
      Enum.frequencies(String.split("to be or not to be")),
      fn {_word, n} -> n end, :desc),
    2),
  label: "top 2")
