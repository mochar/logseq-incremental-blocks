# Incremental blocks - Incremental learning in Logseq

Under construction

- Dynamic priority queue
- Scheduling
- Subset review based on page refs

## Installation
1. Install the plugin
    - Not available in marketplace yet
3. Hide block properties (Optional but recommended)
    - Settings -> edit config.edn -> `:block-hidden-properties #{:ib-a :ib-b :ib-due :ib-interval :ib-reps}`

## Getting started

### 1. Creating an incremental block

- Turn a block into an incremental block (ib) using the slash command or block context menu.
- Select priority and scheduling
- By default, these are informed by the block's page refs, nearest parent ib, page ib, or priority setting, in that order.

### 2. View today's queue

- View today's queue by clicking on the top-right icon.
- Filter on page refs (`[[these]]` or `#these`) by adding them in the settings.

## 3. Reviewing your queue

- Click on the Learn button to start reviewing!
- Actions: Next rep, postpone, done, quit

## Workflows

### Reading a PDF

### Watching a video

### Iterating on an idea

## Implementation details

Explain the priority system.
