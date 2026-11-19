package com.auxo.calllog

import android.Manifest
import android.content.pm.PackageManager
import android.provider.CallLog
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CallLogPermissionException :
  CodedException("ERR_CALL_LOG_PERMISSION", "Call log permission is not granted.", null)

class CallLogModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AuxoCallLog")

    AsyncFunction("getRecentCalls") { sinceDays: Int, limit: Int ->
      val context = appContext.reactContext
        ?: throw CodedException("ERR_CALL_LOG_CONTEXT", "Android context is unavailable.", null)

      if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALL_LOG) !=
        PackageManager.PERMISSION_GRANTED
      ) {
        throw CallLogPermissionException()
      }

      val since = System.currentTimeMillis() - sinceDays.coerceIn(1, 365) * 86_400_000L
      val max = limit.coerceIn(1, 500)
      val calls = mutableListOf<Map<String, Any?>>()
      val projection = arrayOf(
        CallLog.Calls._ID,
        CallLog.Calls.NUMBER,
        CallLog.Calls.CACHED_NAME,
        CallLog.Calls.TYPE,
        CallLog.Calls.DATE,
        CallLog.Calls.DURATION,
      )

      context.contentResolver.query(
        CallLog.Calls.CONTENT_URI,
        projection,
        "${CallLog.Calls.DATE} >= ?",
        arrayOf(since.toString()),
        "${CallLog.Calls.DATE} DESC",
      )?.use { cursor ->
        val idIndex = cursor.getColumnIndexOrThrow(CallLog.Calls._ID)
        val numberIndex = cursor.getColumnIndexOrThrow(CallLog.Calls.NUMBER)
        val nameIndex = cursor.getColumnIndexOrThrow(CallLog.Calls.CACHED_NAME)
        val typeIndex = cursor.getColumnIndexOrThrow(CallLog.Calls.TYPE)
        val dateIndex = cursor.getColumnIndexOrThrow(CallLog.Calls.DATE)
        val durationIndex = cursor.getColumnIndexOrThrow(CallLog.Calls.DURATION)

        while (cursor.moveToNext() && calls.size < max) {
          val type = when (cursor.getInt(typeIndex)) {
            CallLog.Calls.INCOMING_TYPE -> "incoming"
            CallLog.Calls.OUTGOING_TYPE -> "outgoing"
            CallLog.Calls.MISSED_TYPE -> "missed"
            CallLog.Calls.VOICEMAIL_TYPE -> "voicemail"
            CallLog.Calls.REJECTED_TYPE -> "rejected"
            CallLog.Calls.BLOCKED_TYPE -> "blocked"
            else -> "other"
          }
          calls.add(
            mapOf(
              "id" to cursor.getString(idIndex),
              "number" to (cursor.getString(numberIndex) ?: ""),
              "name" to cursor.getString(nameIndex),
              "type" to type,
              "date" to cursor.getLong(dateIndex).toDouble(),
              "durationSeconds" to cursor.getLong(durationIndex),
            ),
          )
        }
      }

      calls
    }
  }
}
