export const SAMPLE_SOURCE = `flowchart TD
  A([Start]) --> B{Decision?}
  B -->|Yes| C[Do the thing]
  B -->|No| D[Do something else]
  C --> E([End])
  D --> E`
