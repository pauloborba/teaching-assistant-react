Feature: Student Data Correlation!
	As a professor 
	I want to be able to see correlations between the data from my previous classes
	So that i can be able to spot patterns and, by that, improve my teaching.

Scenario: "Vendo os dados de correlação no meio de um período quando há turmas."
	Given I am in the "Correlações" section of the professor homepage
	And the data from the current classes is still not available (period not over)
	And there are classes with available data from previous periods
	When i select the option resposible for viewing the correlation data
	Then i see the relevant correleations identified by the system using the data from the previous periods.
	And the correlations are presented as natural-language statements.

Scenario: "Vendo os dados de correlação após a conclusão de um período quando há turmas"
	Given I am in the "correlações" section of the professor homepage
	And the current period has ended.
	And the classes from the ended period have available data
	And There are classes with available data from previous periods.
	When i select the option responsible for viewing the correlation data
	Then i see the relevant correlations identified by the system
	And the correlations include data from the ended period
	And the correlations include data from the previous periods
	And the correlations are presented as natural-language statements.

Scenario: "Vendo os dados de correlação para quando não há turmas anteriores e o período das turmas atuais ainda não acabou"
	Given I am the "correlações" section of the professor homepage
	And there is no data from previous classes
	And the data from the current classes is still not available (period is not over)
	When i select the option responsible for viewing the correlation data
	Then i see only a message telling me there is no data to build correlations from

Scenario: "Visualização dos dados de correlação após a conclusão de um período sem turmas concluídas anteriormente"
	Given I am in the "correlações" section of the professor homepage
	And there is no data from previous classes
	And the current period has ended
	And the classes from the ended period have available data
	When i select the option for viewing the correlation data
	Then  i see the relevant correlations identified by the system
	And the correlations include data from the ended period
	And the correlations are presented as natural-language statements.