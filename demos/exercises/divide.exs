defmodule Calc do
  def divide(_a, 0), do: {:error, :division_by_zero}
  def divide(a, b), do: {:ok, a / b}
end

for {a, b} <- [{10, 4}, {7, 0}] do
  case Calc.divide(a, b) do
    {:ok, result} -> IO.puts("#{a} / #{b} = #{result}")
    {:error, reason} -> IO.puts("#{a} / #{b} failed: #{reason}")
  end
end
