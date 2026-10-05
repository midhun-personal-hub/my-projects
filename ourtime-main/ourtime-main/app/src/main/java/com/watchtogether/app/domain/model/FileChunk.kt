package com.watchtogether.app.domain.model

data class FileChunkHeader(
    val fileId: String,
    val sequence: Long,
    val offset: Long,
    val length: Int,
    val totalSize: Long,
    val isLast: Boolean
)

data class FileChunk(
    val header: FileChunkHeader,
    val data: ByteArray
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as FileChunk
        return header == other.header && data.contentEquals(other.data)
    }

    override fun hashCode(): Int {
        var result = header.hashCode()
        result = 31 * result + data.contentHashCode()
        return result
    }
}
