double = fn x -> x * 2 end
IO.inspect(double.(5), label: "double.(5)")

defmodule Math do
  def square(x), do: x * x
end

IO.inspect(Math.square(4), label: "Math.square(4)")
IO.inspect(Math.square(double.(3)), label: "Math.square(double.(3))")
