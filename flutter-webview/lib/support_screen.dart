// The support screen: the hosted ClickFix widget in a locked-down webview.
// ClickFixController maps one-to-one to the bridge commands; ClickFixWebView
// delivers them over the `ClickFixFlutter` JavaScript channel and surfaces
// the widget's messages as callbacks.
import 'package:clickfix_webview/clickfix_webview.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'config.dart';
import 'support_session.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key, this.conversation, this.loadSession});

  /// Conversation to open on load (deep link from a push notification built
  /// on the message.sent webhook).
  final String? conversation;

  /// Injectable for tests; defaults to [fetchSupportSession].
  final Future<SupportSession> Function()? loadSession;

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  late final ClickFixController controller = ClickFixController(
    widgetId: widgetId,
    origin: clickFixOrigin,
    locale: 'tr',
    theme: ClickFixTheme.auto,
    conversation: widget.conversation,
    // Only after your app really collected consent (GDPR/KVKK).
    consent: true,
    onRejectedMessage: (code) => debugPrint('clickfix: dropped message $code'),
  );
  int unread = 0;
  String status = 'loading';

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  Future<void> _onReady(ClickFixReady ready) async {
    setState(() => status = 'ready (widget ${ready.sdkVersion})');
    try {
      final session = await (widget.loadSession ?? fetchSupportSession)();
      // clickfix:identify, completed by the widget's clickfix:result.
      await controller.identify(session.toIdentity());
      // App context the agent sees with the next message.
      await controller.track('app_screen', properties: {'screen': 'support'});
      if (mounted) setState(() => status = 'identified as ${session.userId}');
    } on ClickFixBridgeError catch (e) {
      // WIDGET_IDENTITY_INVALID, WIDGET_IDENTITY_DISABLED, TIMEOUT, ...: the
      // visitor stays anonymous and can still chat.
      if (mounted) setState(() => status = 'identify failed: ${e.code}');
    } catch (e) {
      if (mounted) setState(() => status = 'backend error: $e');
    }
  }

  void _onEvent(ClickFixEvent event) {
    if (event.event == 'identify') {
      final companyBound = event.payload['company_verified'] == true;
      setState(
        () => status = companyBound
            ? 'verified, company bound'
            : 'verified, company not bound',
      );
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Support'),
      actions: [
        IconButton(
          icon: const Icon(Icons.add_comment_outlined),
          tooltip: 'New conversation',
          onPressed: () => controller.open(view: ClickFixView.newConversation),
        ),
        IconButton(
          icon: const Icon(Icons.logout),
          tooltip: 'Log out (reset)',
          onPressed: () => controller.reset(),
        ),
      ],
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(24),
        child: Text(status, key: const Key('status')),
      ),
    ),
    body: ClickFixWebView(
      controller: controller,
      onReady: _onReady,
      onEvent: _onEvent,
      // Already validated by the package (https only); open outside the app.
      onLink: (link) =>
          launchUrl(link.url, mode: LaunchMode.externalApplication),
      onUnread: (count) => unread = count,
      onClose: () => Navigator.of(context).pop(unread),
    ),
  );
}
