package com.vietride.vnpay

import android.content.Intent
import com.vnpay.authentication.VNP_AuthenticationActivity
import com.vnpay.authentication.VNP_SdkCompletedCallback
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.net.URI
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

class ShowVnPayArgs : Record {
  @Field
  var paymentUrl: String = ""

  @Field
  var tmnCode: String = ""

  @Field
  var scheme: String = ""

  @Field
  var isSandbox: Boolean = false
}

class VietRideVnPayModule : Module() {
  private val isOpening = AtomicBoolean(false)

  override fun definition() = ModuleDefinition {
    Name("VietRideVnPay")
    Events("PaymentBack")

    OnDestroy {
      isOpening.set(false)
      VNP_AuthenticationActivity.setSdkCompletedCallback(null)
    }

    AsyncFunction("show") { args: ShowVnPayArgs, promise: Promise ->
      val paymentUrl = args.paymentUrl.trim()
      val tmnCode = args.tmnCode.trim()
      val scheme = args.scheme.trim()
      if (paymentUrl.isEmpty() || tmnCode.isEmpty() || scheme.isEmpty()) {
        promise.reject(
          VnPayCodedException(
            "VNPAY_SDK_META_INVALID",
            "VNPay SDK metadata is incomplete.",
          ),
        )
        return@AsyncFunction
      }

      if (scheme != APP_SCHEME) {
        promise.reject(
          VnPayCodedException(
            "VNPAY_SDK_SCHEME_INVALID",
            "VNPay SDK scheme must match the VietRide app scheme.",
          ),
        )
        return@AsyncFunction
      }

      if (!isTrustedPaymentUrl(paymentUrl)) {
        promise.reject(
          VnPayCodedException(
            "VNPAY_REDIRECT_UNTRUSTED",
            "Payment URL is not a trusted VNPay HTTPS host.",
          ),
        )
        return@AsyncFunction
      }

      if (!isOpening.compareAndSet(false, true)) {
        promise.reject(
          VnPayCodedException(
            "VNPAY_SDK_ALREADY_OPEN",
            "A VNPay SDK activity is already opening.",
          ),
        )
        return@AsyncFunction
      }

      try {
        val context = appContext.reactContext
          ?: throw VnPayCodedException(
            "VNPAY_SDK_UNAVAILABLE",
            "React context is not ready.",
          )

        VNP_AuthenticationActivity.setSdkCompletedCallback(
          VNP_SdkCompletedCallback { action ->
            isOpening.set(false)
            sendEvent(
              "PaymentBack",
              mapOf("resultCode" to mapActionToResultCode(action)),
            )
          },
        )

        val intent = Intent(context, VNP_AuthenticationActivity::class.java).apply {
          putExtra("url", paymentUrl)
          putExtra("tmn_code", tmnCode)
          putExtra("scheme", scheme)
          putExtra("is_sandbox", args.isSandbox)
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        promise.resolve(null)
      } catch (error: Exception) {
        isOpening.set(false)
        VNP_AuthenticationActivity.setSdkCompletedCallback(null)
        promise.reject(
          if (error is VnPayCodedException) {
            error
          } else {
            VnPayCodedException(
              "VNPAY_SDK_OPEN_FAILED",
              "Unable to open the VNPay SDK activity.",
              error,
            )
          },
        )
      }
    }
  }

  private fun isTrustedPaymentUrl(paymentUrl: String): Boolean = try {
    val uri = URI(paymentUrl)
    val hostname = uri.host?.lowercase(Locale.ROOT)
    uri.scheme.equals("https", ignoreCase = true)
      && uri.userInfo == null
      && hostname != null
      && TRUSTED_PAYMENT_HOSTS.any { trustedHost ->
        hostname == trustedHost || hostname.endsWith(".$trustedHost")
      }
  } catch (_: Exception) {
    false
  }

  private fun mapActionToResultCode(action: String?): Int = when (action) {
    "AppBackAction" -> RESULT_APP_BACK
    "CallMobileBankingApp" -> RESULT_CALL_MOBILE_BANKING
    "SuccessBackAction" -> RESULT_SUCCESS
    "FaildBackAction" -> RESULT_FAILED
    "WebBackAction" -> RESULT_CANCELLED
    else -> RESULT_FAILED
  }

  companion object {
    private const val APP_SCHEME = "vietride"
    private val TRUSTED_PAYMENT_HOSTS = listOf(
      "vnpay.vn",
      "vnpayment.vn",
    )
    private const val RESULT_APP_BACK = -1
    private const val RESULT_CALL_MOBILE_BANKING = 10
    private const val RESULT_SUCCESS = 97
    private const val RESULT_FAILED = 98
    private const val RESULT_CANCELLED = 99
  }
}

private class VnPayCodedException(
  code: String,
  message: String,
  cause: Throwable? = null,
) : CodedException(code, message, cause)
