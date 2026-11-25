defprotocol Describe do
  def describe(thing)
end

defimpl Describe, for: List do
  def describe(l), do: "a list of #{length(l)} items"
end

defimpl Describe, for: Integer do
  def describe(n), do: "the number #{n}"
end

defmodule User do
  defstruct [:name, :age]
end

# Added later, without touching the code above
defimpl Describe, for: User do
  def describe(u), do: "#{u.name} is #{u.age}"
end
