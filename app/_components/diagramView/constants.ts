export const SAMPLE_SOURCE = `flowchart TD
  A([Start]) --> B{Decision?}
  B -->|Yes| C[Do the thing]
  B -->|No| D[Do something else]
  C --> E([End])
  D --> E`

export const SAMPLE_SEQUENCE_SOURCE = `sequenceDiagram
  Alice->>Bob: hello
  Bob-->>Alice: hi back
  Alice->>Alice: think`
