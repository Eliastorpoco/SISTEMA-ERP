import React from "react";
import "./aulaVirtualResponsive.css";
import "./aulaVirtualTheme.css";
import "./aulaVirtualMobileCompact.css";
import "./aulaVirtualMobileFinal.css";

export default function TeacherLearningLayout(props) {
  const childrenArray = React.Children.toArray(props.children);

  const leftContent =
    props.left ??
    props.leftPanel ??
    props.leftNav ??
    props.sidebar ??
    props.navigation ??
    props.menu ??
    (childrenArray.length === 3 ? childrenArray[0] : null);

  const centerContent =
    props.center ??
    props.centerPanel ??
    props.workspace ??
    props.learningWorkspace ??
    props.main ??
    props.mainContent ??
    props.content ??
    (childrenArray.length === 3
      ? childrenArray[1]
      : childrenArray.length > 0
      ? childrenArray
      : null);

  const rightContent =
    props.right ??
    props.rightPanel ??
    props.rightAside ??
    props.aside ??
    props.panel ??
    (childrenArray.length === 3 ? childrenArray[2] : null);

  return (
    <div className="aula-teacher-layout">
      {rightContent && (
        <section className="aula-top-panel">
          {rightContent}
        </section>
      )}

      {leftContent && (
        <aside className="aula-teacher-left">
          {leftContent}
        </aside>
      )}

      <main className="aula-teacher-center">
        {centerContent}
      </main>
    </div>
  );
}