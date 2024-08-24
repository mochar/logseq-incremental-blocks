# Incremental blocks - Incremental learning in Logseq

WIP - alpha

This plugin allows you to mark logseq blocks as incremental blocks (ibs), scheduling them for _repeated_ review.
The queue of (over)due ibs should be regularly tended to.
This will quickly become overwhelming as the number of ibs increase.
An integral part is therefore the plugin's priority system, which will have you review ibs of higher importance more consistently, while letting less important yet potentially interesting ibs resurface.

### Incremental learning

The plugin is inspired by [SuperMemo](https://supermemo.store/products/supermemo-19-for-windows)'s [incremental reading](https://supermemo.guru/wiki/Incremental_reading) functionality:
You load texts such as books and articles into the system, assign them a priority and schedule them for repeated review.
On review, one is meant to extract parts of the text that are deemed somehow important or interesting, turning the extracts themselves into their own independent units with priority and scheduling.
Extracts are meant to be engaged with such as by reformulating them in your own words, deleting parts that are not useful for you, or by just pondering on them during review.
Information is slowly distilled down into small units of information, which can then be turned into flashcards.

The extraction process is implemented in the plugin:

![extracting](https://github.com/user-attachments/assets/5792c88b-dda9-42a9-805d-15033b5ce14a)


### Why?

The incremental reading process is the learning phase prior to attempting to memorize the information using flashcards.
Having familiarized yourself with the content due to repeated engagement will lead to better recall of the flashcards, while making the entirety of the process more [pleasurable](https://supermemo.guru/wiki/Pleasure_of_learning).

However the incremental process is also useful without memorization as an end goal:

- If you have a large number of browser tabs or texts (books, articles) you have been meaning to read, this plugin gives you a way to be reminded of them repeatedly over time.
- If you need to practice some skill such as language learning or playing an instrument, this plugin can help you schedule this practice.
- If you want to write an article/assay/etc incrementally over time. See [incremental writing](https://supermemo.guru/wiki/Incremental_writing).
- If you just like to regularly revisit a block or page.

Furthermore you are not limited to just text in blocks:

- The plugin provides tools to extract sections of youtube videos, or local audio/video files.
- You can use logseq's pdf annotation functionality to process pdfs incrementally.

Take a look at [example workflows](##example-workflows) below to see this in action.

## Installation
1. Install the plugin
    - Not available in marketplace yet
    - [Download here](https://github.com/mochar/logseq-incremental-blocks/releases). Unzip. Turn on developer mode in logseq. Plugins -> load unpacked plugin.
3. Hide block properties (Optional but recommended)
    - Settings -> edit config.edn -> `:block-hidden-properties #{:ib-a :ib-b :ib-due :ib-interval :ib-reps :ib-multiplier}`

## Getting started

### 1. Creating an incremental block

- Turn a block into an incremental block (ib) using the slash command, block context menu, or shortcut.
- Select priority and scheduling.
- By default, these are informed by the block's page refs, nearest parent ib, page ib, or priority setting, in that order.

![create_ib](https://github.com/user-attachments/assets/9c53af99-47b2-4013-960b-39c91684dbc0)


### 2. View today's queue

- View today's queue by clicking on the top-right icon.
- Filter on page refs (`[[these]]` or `#these`) by adding them in the settings.

![queue](https://github.com/user-attachments/assets/6217b3f5-862d-4428-8c8c-4aa2add7fea9)

### 3. Reviewing your queue

- Click on the Learn button to start reviewing!
- Extract selected text with ctrl-alt-x, or turn it into a cloze ib (ctrl-alt-z) or cloze flashcard (ctrl+alt+shift+z).
- Actions: Next rep, postpone, done, quit

![learn](https://github.com/user-attachments/assets/a9d96dc1-fb4f-4274-8442-5d5df6013883)

## Example workflows

### Scheduled instrument practice from youtube video

[youtube_extract.webm](https://github.com/user-attachments/assets/d12bdff9-18de-4393-820d-97e3c18becce)


### Going through a manual

I have started learning emacs, which uses a lot of key bindings I am unfamiliar with, and uses arcane terminology that I need to learn.
My goal is to understand and memorize the basics from the emacs tutorial, available as a text document, which I convert to logseq-style markdown using [longdown](https://github.com/dundalek/longdown).

1. Import the tutorial into its own logseq page.
2. Turn the page block (first block of page) into an ib without scheduling. Child ibs will inherit the priortiy.
3. Turn all heading blocks into ibs.
4. Review, extract, and make flashcards when its time (or do so whenever you like).

![emacs](https://github.com/user-attachments/assets/0adde37f-b788-4dbb-b7e2-f7940c3b5bc5)


### Language learning using Ilya Frank's method

extract youtube captions, turn into ibs, extract to cloze.

### Deep learning a book (PDF)

Auto ib functionality will automatically convert new blocks to ibs.

## Implementation details

Explain the priority system.
