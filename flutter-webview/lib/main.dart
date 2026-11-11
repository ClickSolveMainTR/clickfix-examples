// ClickFix + Flutter example. Home screen with an unread badge and a Support
// button; the support screen is lib/support_screen.dart.
//
//   flutter run --dart-define=CLICKFIX_WIDGET_ID=... --dart-define=API_URL=http://10.0.2.2:3000
//   add --dart-define=CLICKFIX_CONVERSATION=<uuid> to open a conversation (deep link)
import 'package:flutter/material.dart';

import 'config.dart';
import 'support_screen.dart';

void main() => runApp(const ExampleApp());

class ExampleApp extends StatelessWidget {
  const ExampleApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'ClickFix example',
    theme: ThemeData(colorSchemeSeed: Colors.indigo),
    home: const HomeScreen(),
  );
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int unread = 0;

  Future<void> _openSupport({String? conversation}) async {
    final result = await Navigator.of(context).push<int>(
      MaterialPageRoute(
        builder: (_) => SupportScreen(conversation: conversation),
      ),
    );
    if (result != null) setState(() => unread = result);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('My app')),
    body: Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Widget: $widgetId\nOrigin: $clickFixOrigin\nBackend: $apiUrl',
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            icon: Badge.count(
              count: unread,
              isLabelVisible: unread > 0,
              child: const Icon(Icons.support_agent),
            ),
            label: const Text('Support'),
            onPressed: () => _openSupport(
              conversation: conversationToOpen.isEmpty
                  ? null
                  : conversationToOpen,
            ),
          ),
        ],
      ),
    ),
  );
}
