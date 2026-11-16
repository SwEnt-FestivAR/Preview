// Copied by scripts/scan-previews.mjs into a throwaway CI clone of FestivAR (never committed there).
// Renders every @Preview of the app with Robolectric (no emulator) in a few variants and writes, for
// each one, a PNG plus a JSON with the clickable areas (used by the "hand" of the demo mode).
// Variant ids ("light", "dark", "font") must match scripts/lib/config.mjs and site/js/util.js.
// Output: build/weekly-demo/<previewId>__<variant>.png and .json ({ ok, w, h, taps, texts } or
// { ok: false, error }). `texts` (shown text) lets scripts/lib/links.mjs find where a tap leads.
package weeklydemo

import android.content.res.Configuration
import android.graphics.Bitmap
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.currentComposer
import androidx.compose.runtime.reflect.getDeclaredComposableMethod
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.isRoot
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import java.io.File
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

class Shot(
    val id: String,
    val cls: String,
    val fn: String,
    val w: Int,
    val h: Int,
    val bg: Boolean,
    val variant: String,
) {
  override fun toString() = "$id@$variant"
}

@RunWith(ParameterizedRobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
// Window large enough for a 412x915 dp phone screen; xhdpi = 2 px per dp.
@Config(sdk = [34], qualifiers = "w480dp-h1000dp-xhdpi")
class WeeklyDemoCapture(private val s: Shot) {
  @get:Rule val rule = createComposeRule()

  companion object {
    @JvmStatic
    @ParameterizedRobolectricTestRunner.Parameters(name = "{0}")
    fun params(): List<Array<Any>> = SHOTS.map { arrayOf<Any>(it) }

    private val SHOTS: List<Shot> =
        listOf(
            /*SHOTS*/
        )
  }

  @Test
  fun capture() {
    val out = File("build/weekly-demo").apply { mkdirs() }
    val base = "${s.id}__${s.variant}"
    try {
      val method = Class.forName(s.cls).getDeclaredComposableMethod(s.fn)
      method.asMethod().isAccessible = true
      val night = s.variant == "dark"
      rule.mainClock.autoAdvance = false
      rule.setContent {
        val cfg =
            Configuration(LocalConfiguration.current).apply {
              uiMode =
                  (uiMode and Configuration.UI_MODE_NIGHT_MASK.inv()) or
                      (if (night) Configuration.UI_MODE_NIGHT_YES
                      else Configuration.UI_MODE_NIGHT_NO)
              if (s.variant == "font") fontScale = 1.5f
            }
        val density = LocalDensity.current.density
        CompositionLocalProvider(
            LocalConfiguration provides cfg,
            LocalDensity provides Density(density, cfg.fontScale),
        ) {
          // Screens get a fixed phone size (h > 0) and always a background; components wrap.
          var mod = if (s.h > 0) Modifier.size(s.w.dp, s.h.dp) else Modifier.width(s.w.dp)
          if (s.bg || s.h > 0) mod = mod.background(if (night) Color(0xFF121212) else Color.White)
          Box(mod) { method.invoke(currentComposer, null) }
        }
      }
      rule.mainClock.advanceTimeBy(1500)
      rule.waitForIdle()

      // Dialogs open their own window: capture the top-most one.
      val root: SemanticsNodeInteraction =
          try {
            rule.onRoot().also { it.fetchSemanticsNode() }
          } catch (e: AssertionError) {
            val roots = rule.onAllNodes(isRoot())
            roots[roots.fetchSemanticsNodes().size - 1]
          }
      val bmp = root.captureToImage().asAndroidBitmap()
      File(out, "$base.png").outputStream().use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }

      val rootNode = root.fetchSemanticsNode()
      val rw = rootNode.size.width.toFloat().coerceAtLeast(1f)
      val rh = rootNode.size.height.toFloat().coerceAtLeast(1f)
      val taps =
          rule
              .onAllNodes(hasClickAction())
              .fetchSemanticsNodes(atLeastOneRootRequired = false)
              .filter { it.root == rootNode.root }
              .map { n ->
                val b = n.boundsInRoot
                val label =
                    n.config.getOrNull(SemanticsProperties.Text)?.joinToString(" ") { it.text }
                        ?: n.config.getOrNull(SemanticsProperties.ContentDescription)?.joinToString(" ")
                        ?: ""
                "{\"x\":${b.left / rw},\"y\":${b.top / rh},\"w\":${b.width / rw}," +
                    "\"h\":${b.height / rh},\"label\":${json(label)}}"
              }
      // Visible text (not editable field values), to match a tapped label with the screen it opens.
      val texts =
          rule
              .onAllNodes(SemanticsMatcher.keyIsDefined(SemanticsProperties.Text))
              .fetchSemanticsNodes(atLeastOneRootRequired = false)
              .filter { it.root == rootNode.root }
              .flatMap { n -> n.config.getOrNull(SemanticsProperties.Text).orEmpty().map { it.text.trim() } }
              .filter { it.isNotEmpty() }
              .distinct()
              .take(80)
              .joinToString(",") { json(it.take(120)) }
      File(out, "$base.json")
          .writeText(
              "{\"ok\":true,\"w\":${bmp.width},\"h\":${bmp.height}," +
                  "\"taps\":[${taps.joinToString(",")}],\"texts\":[$texts]}")
    } catch (t: Throwable) {
      File(out, "$base.json").writeText("{\"ok\":false,\"error\":${json(t.toString().take(400))}}")
    }
  }

  private fun json(v: String) =
      "\"" + v.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ").replace("\t", " ") + "\""
}
