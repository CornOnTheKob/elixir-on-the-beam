defmodule Greeter do
  def hello(:morning), do: "Good morning!"
  def hello(:night), do: "Good night!"
  def hello(name) when is_binary(name), do: "Hello, #{name}!"
  def hello(_other), do: "Hello, stranger!"
end

IO.puts(Greeter.hello(:morning))
IO.puts(Greeter.hello(:night))
IO.puts(Greeter.hello("Ada"))
IO.puts(Greeter.hello(42))
