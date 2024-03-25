import { assert } from '@l2beat/backend-tools'

const ChannelTimeoutBlocks = 300

export interface Frame {
  frameData: Uint8Array
  channelId: channelId
  isLast: boolean
  frameNumber: number
}

type channelId = string

export class ChannelBank {
  // TODO: channels should be saved to the db so they're persistent
  // TODO: We should have a channel queue, but it's probably not necessary
  // Channels are recorded in FIFO order in a structure called the channel queue.
  // A channel is added to the channel queue the first time a frame belonging to the channel is seen.

  private readonly channels = new Map<channelId, Channel>()

  /**
   * This function will add frames from a single transaction to the channel.
   * It will return a channel if the frames array is not full (last )
   *
   * @param frames frames to add to the channel. All frames should be from the same channel
   * @returns closed channel or null
   */
  addFramesToChannel(frames: Frame[], blockNumber: number): Channel | null {
    this.dropOutdatedChannels(blockNumber)

    const channelIds = new Set(frames.map((f) => f.channelId))
    assert(
      channelIds.size === 1,
      'All frames should belong to the same channel',
    )
    const channelId = frames[0].channelId

    let channel = this.channels.get(channelId)
    if (!channel) {
      channel = new Channel(channelId, blockNumber)
      this.channels.set(channelId, channel)
    }
    let isClosed = false
    for (const frame of frames) {
      isClosed = channel.addNextFrame(frame)
    }

    if (isClosed) {
      this.channels.delete(channelId)
      return channel
    }

    console.log('Channel saved for later', { blockNumber, channelId })
    return null
  }

  private dropOutdatedChannels(blockNumber: number) {
    for (const channel of this.channels.values()) {
      if (blockNumber - channel.l1Origin > ChannelTimeoutBlocks) {
        this.channels.delete(channel.channelId)
      }
    }
  }
}

export class Channel {
  private readonly frames: Frame[] = []
  private isClosed = false

  constructor(readonly channelId: channelId, readonly l1Origin: number) {}

  addNextFrame(frame: Frame) {
    assert(frame.channelId === this.channelId, 'Invalid channelId')
    assert(!this.isClosed, 'Channel is closed, cannot add frames')
    const previousFrame = this.frames.at(-1)
    if (!previousFrame) {
      assert(frame.frameNumber === 0, 'Frame out of order!')
    } else {
      assert(
        frame.frameNumber === previousFrame.frameNumber + 1,
        'Frame out of order!',
      )
    }

    this.frames.push(frame)
    assert(this.frames.length - 1 === frame.frameNumber, 'Wrong frames length')
    if (frame.isLast) {
      this.isClosed = true
    }

    return this.isClosed
    // it would make sense to save the channel in the DB so we never forget opened channels
  }

  assemble() {
    assert(this.isClosed, 'Cannot assemble closed channel')

    const dataLength = this.frames.reduce(
      (acc, frame) => acc + frame.frameData.length,
      0,
    )
    const data = new Uint8Array(dataLength)
    let offset = 0
    for (const frame of this.frames) {
      data.set(frame.frameData, offset)
      offset += frame.frameData.length
    }
    return data
  }
}
